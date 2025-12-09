import {
  AfterViewInit,
  Component,
  inject,
  OnInit,
  signal,
  ViewChild,
} from '@angular/core';
import { firstValueFrom, lastValueFrom } from 'rxjs';
import { CalendarModule } from 'primeng/calendar';
import { InformacoesColaboradorService } from './services/informacoes-colaborador.service';
import { LoadingComponent } from '../../shared/components/loading/loading.component';
import { FormsModule } from '@angular/forms';
import { ToastModule } from 'primeng/toast';
import { RippleModule } from 'primeng/ripple';
import { MessageService } from 'primeng/api';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { Persistencia } from './services/models/persistencia';
import { BuscaColaboradoresComponent } from './components/busca-colaboradores/busca-colaboradores.component';
import { format } from 'date-fns';
import { TokenService } from '../../core/services/token.service';

@Component({
  selector: 'app-historicos-colaborador',
  standalone: true,
  imports: [
    FormsModule,
    BuscaColaboradoresComponent,
    LoadingComponent,
    CalendarModule,
    ToastModule,
    ProgressSpinnerModule,
    RippleModule,
  ],
  providers: [MessageService],
  templateUrl: './historicos-colaborador.component.html',
  styleUrl: './historicos-colaborador.component.css',
})
export class HistoricosColaboradorComponent implements OnInit, AfterViewInit {
  @ViewChild(BuscaColaboradoresComponent, { static: true })
  buscaColaboradoresComponent: BuscaColaboradoresComponent | undefined;

  private informacoesColaboradorService = inject(InformacoesColaboradorService);
  private tokenService = inject(TokenService);

  carregandoInformacoes = signal(false);
  papelAdm: string;

  constructor(private messageService: MessageService) {}

  async ngOnInit(): Promise<void> {
    await this.checkInicializacao();
    this.carregandoInformacoes.set(true);
    this.inicializaComponente();
  }

  async ngAfterViewInit(): Promise<void> {
    await this.checkInicializacao();
    await this.buscaPapeisSolicitante();
    this.inicializarBuscaColaboradores();
    this.carregandoInformacoes.set(false);
  }

  async checkInicializacao(): Promise<void> {
    while (
      !this.tokenService.token$.value?.accessToken ||
      !this.tokenService.username
    ) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      this.tokenService.carregarToken();
    }
  }

  inicializaComponente(): void {
    this.buscaColaboradoresComponent.limparFormulario();
  }

  async ibuscaPapelSolicitante(): Promise<void> {
    if (!this.papelAdm) this.buscaColaboradoresComponent.opcoesIniciais();
  }

  async inicializarBuscaColaboradores(): Promise<void> {
    this.buscaColaboradoresComponent.opcoesIniciais();
  }

  async buscaPapeisSolicitante(): Promise<void> {
    try {
      const projetos = await firstValueFrom(
        this.informacoesColaboradorService.obterPapelSolicitante()
      );
      if (projetos.outputData.message) {
        this.notificarErro(
          'Erro ao identificar o papel solicitante, ' +
            projetos.outputData.message
        );
        this.papelAdm = 'N';
      } else {
        this.papelAdm = projetos.outputData.APapelAdmAgendaEquipe || 'N';
        this.buscaColaboradoresComponent.preenchePapelSolicitante(
          this.papelAdm
        );
      }
    } catch (error) {
      console.error(error);
      this.notificarErro(
        'Erro ao buscar os papeis do solicitante, tente mais tarde ou contate o admnistrador. ' +
          error
      );
      this.papelAdm = 'N';
      this.carregandoInformacoes.set(false);
    }
  }

  notificarErro(mensagem: string) {
    this.messageService.add({
      severity: 'error',
      summary: 'Erro',
      detail: mensagem,
      life: 10000,
    });
  }
  notificarSucesso(mensagem: string) {
    this.messageService.add({
      severity: 'success',
      summary: 'Sucesso',
      detail: mensagem,
      life: 10000,
    });
  }

  async enviarSolicitacao(): Promise<void> {
    this.desabilitarFormulario(true);
    this.carregandoInformacoes.set(true);
    await this.gravarEnvio();
  }

  desabilitarFormulario(desabilitar: boolean): void {
    this.buscaColaboradoresComponent.desabilitarFormulario(desabilitar);
  }

  async gravarEnvio(): Promise<void> {
    await lastValueFrom(
      this.informacoesColaboradorService.gravarEnvio(this.montaCorpoEnvio())
    ).then(
      (data) => {
        if (data.outputData.message || data.outputData.ARetorno != 'OK') {
          this.notificarErro(
            'Erro ao gravar a data retroativa, ' +
              (data.outputData?.message || data.outputData?.ARetorno)
          );
          this.carregandoInformacoes.set(false);
          this.desabilitarFormulario(false);
        } else {
          this.notificarSucesso('Gravado com sucesso!');
          this.inicializaComponente();
          this.carregandoInformacoes.set(false);
          this.desabilitarFormulario(false);
        }
      },
      () => {
        this.notificarErro(
          'Erro ao gravar a data retroativa, tente mais tarde ou contate o administrador'
        );
        this.carregandoInformacoes.set(false);
        this.desabilitarFormulario(false);
      }
    );
  }

  formatarData(data: Date): string {
    return format(data, 'dd/MM/yyyy');
  }

  montaCorpoEnvio(): Persistencia {
    return {
      nEmpresa: Number(this.buscaColaboradoresComponent.colaborador?.NEmpresa),
      nTipoColaborador: Number(
        this.buscaColaboradoresComponent.colaborador?.NTipoColaborador
      ),
      nMatricula: Number(
        this.buscaColaboradoresComponent.colaborador?.NMatricula
      ),
      dData: this.formatarData(this.buscaColaboradoresComponent.dataRetrotiva),
    } as Persistencia;
  }
}
